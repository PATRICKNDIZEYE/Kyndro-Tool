#!/usr/bin/env python3
"""Validate every golden fixture against the Kyndro contract (see ADR-007).

Zero-dependency by design: python3 stdlib + PyYAML (preinstalled). Implements the
subset of JSON Schema draft 2020-12 that the contract actually uses, so fixtures
are checked against BOTH contract/openapi.yaml component schemas and the
standalone event schemas in contract/events/.

Usage (CI-runnable, from anywhere):
    python3 fixtures/validate.py
Exit code 0 = every fixture conforms; non-zero = at least one mismatch.
"""

import json
import pathlib
import re
import sys

import yaml

FIXTURES_DIR = pathlib.Path(__file__).resolve().parent
REPO_ROOT = FIXTURES_DIR.parent
CONTRACT_DIR = REPO_ROOT / "contract"

TYPE_CHECKS = {
    "object": lambda v: isinstance(v, dict),
    "array": lambda v: isinstance(v, list),
    "string": lambda v: isinstance(v, str),
    "integer": lambda v: isinstance(v, int) and not isinstance(v, bool),
    "number": lambda v: isinstance(v, (int, float)) and not isinstance(v, bool),
    "boolean": lambda v: isinstance(v, bool),
    "null": lambda v: v is None,
}


def resolve_ref(ref: str, root: dict) -> dict:
    if not ref.startswith("#/"):
        raise ValueError(f"only internal $refs are supported, got {ref!r}")
    node = root
    for part in ref[2:].split("/"):
        part = part.replace("~1", "/").replace("~0", "~")
        node = node[part]
    return node


def validate(value, schema, root, path, errors):
    """Recursively validate `value` against `schema`; append messages to `errors`."""
    if "$ref" in schema:
        validate(value, resolve_ref(schema["$ref"], root), root, path, errors)
        return

    for sub in schema.get("allOf", []):
        validate(value, sub, root, path, errors)

    for key in ("oneOf", "anyOf"):
        if key in schema:
            matches = 0
            for sub in schema[key]:
                trial = []
                validate(value, sub, root, path, trial)
                if not trial:
                    matches += 1
            if (key == "oneOf" and matches != 1) or (key == "anyOf" and matches < 1):
                errors.append(f"{path}: matched {matches} branches of {key}")

    if "const" in schema and value != schema["const"]:
        errors.append(f"{path}: expected const {schema['const']!r}, got {value!r}")

    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"{path}: {value!r} not in enum {schema['enum']}")

    if "type" in schema:
        types = schema["type"] if isinstance(schema["type"], list) else [schema["type"]]
        if not any(TYPE_CHECKS[t](value) for t in types):
            errors.append(f"{path}: expected type {types}, got {type(value).__name__}")
            return  # type is wrong; deeper keyword checks would be noise

    if isinstance(value, str):
        if "pattern" in schema and not re.search(schema["pattern"], value):
            errors.append(f"{path}: {value!r} does not match pattern {schema['pattern']!r}")
        if "minLength" in schema and len(value) < schema["minLength"]:
            errors.append(f"{path}: shorter than minLength {schema['minLength']}")
        if "maxLength" in schema and len(value) > schema["maxLength"]:
            errors.append(f"{path}: longer than maxLength {schema['maxLength']}")

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            errors.append(f"{path}: {value} < minimum {schema['minimum']}")
        if "maximum" in schema and value > schema["maximum"]:
            errors.append(f"{path}: {value} > maximum {schema['maximum']}")

    if isinstance(value, list):
        if "minItems" in schema and len(value) < schema["minItems"]:
            errors.append(f"{path}: fewer than minItems {schema['minItems']}")
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            errors.append(f"{path}: more than maxItems {schema['maxItems']}")
        if "items" in schema:
            for i, item in enumerate(value):
                validate(item, schema["items"], root, f"{path}[{i}]", errors)

    if isinstance(value, dict):
        props = schema.get("properties", {})
        for req in schema.get("required", []):
            if req not in value:
                errors.append(f"{path}: missing required property {req!r}")
        for name, sub in props.items():
            if name in value:
                validate(value[name], sub, root, f"{path}.{name}", errors)
        extra = schema.get("additionalProperties")
        if extra is False:
            for name in value:
                if name not in props:
                    errors.append(f"{path}: unexpected property {name!r}")
        elif isinstance(extra, dict):
            for name in value:
                if name not in props:
                    validate(value[name], extra, root, f"{path}.{name}", errors)


def load_case_schema(spec: str, openapi: dict):
    """Return (schema, root_document) for a manifest schema pointer."""
    if spec.startswith("openapi:"):
        return resolve_ref(spec[len("openapi:"):], openapi), openapi
    doc = json.loads((CONTRACT_DIR / spec).read_text())
    return doc, doc


def semantic_checks(payloads):
    """Cross-fixture guarantees from the packet's acceptance criteria."""
    failures = []

    obligations = [p for f, p in payloads.items() if f.startswith("obligations/")]
    verdicts = sorted(o["verdict"] for o in obligations)
    if verdicts != ["FALSIFIED", "UNKNOWN", "VERIFIED"]:
        failures.append(f"obligation fixtures must cover exactly the 3 verdicts, got {verdicts}")
    for o in obligations:
        v = o["verdict"]
        rules = {
            "verified": v == "VERIFIED",
            "counterexample": v == "FALSIFIED",
            "unknown_reason": v == "UNKNOWN",
        }
        for field, should_be_set in rules.items():
            if (o.get(field) is not None) != should_be_set:
                failures.append(
                    f"obligation {o['id']}: field {field!r} must be "
                    f"{'non-null' if should_be_set else 'null'} when verdict is {v}"
                )

    specs = payloads.get("specs/candidate-specs.json", [])
    if len(specs) != 10:
        failures.append(f"expected exactly 10 candidate specs, got {len(specs)}")
    if len({s["id"] for s in specs}) != len(specs):
        failures.append("candidate spec ids are not unique")

    cex_files = [f for f in payloads if f.startswith("counterexamples/")]
    if len(cex_files) != 1:
        failures.append(f"expected exactly 1 counterexample fixture, got {len(cex_files)}")

    pr_run = payloads.get("analyzed-pr/run-pr42.json", {})
    if not pr_run.get("pr"):
        failures.append("analyzed PR fixture must carry a non-null pr object")

    return failures


def main() -> int:
    manifest = json.loads((FIXTURES_DIR / "manifest.json").read_text())
    openapi = yaml.safe_load((CONTRACT_DIR / "openapi.yaml").read_text())

    failed = False
    payloads = {}
    for case in manifest["cases"]:
        rel, spec = case["file"], case["schema"]
        payload = json.loads((FIXTURES_DIR / rel).read_text())
        payloads[rel] = payload
        schema, root = load_case_schema(spec, openapi)

        errors = []
        if case.get("each"):
            if not isinstance(payload, list):
                errors.append("$: expected a JSON array for an 'each' case")
            else:
                for i, item in enumerate(payload):
                    validate(item, schema, root, f"$[{i}]", errors)
        else:
            validate(payload, schema, root, "$", errors)

        status = "ok" if not errors else "FAIL"
        print(f"[{status}] {rel} -> {spec}")
        for e in errors:
            print(f"       {e}")
        failed = failed or bool(errors)

    for failure in semantic_checks(payloads):
        print(f"[FAIL] semantic: {failure}")
        failed = True

    if failed:
        print("fixture validation FAILED")
        return 1
    print(f"fixture validation passed: {len(manifest['cases'])} cases, manifest v{manifest['version']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
