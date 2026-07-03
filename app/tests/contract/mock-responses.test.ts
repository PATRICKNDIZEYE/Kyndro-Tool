// @vitest-environment node
// swagger-parser detects "browser" mode from the presence of `window`, which jsdom
// polyfills; forcing node here keeps it on the filesystem resolver instead of
// trying to fetch the contract path as a URL against jsdom's fake location.
import path from "node:path";
import SwaggerParser from "@apidevtools/swagger-parser";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { beforeAll, describe, expect, it } from "vitest";
import { API_BASE } from "../../mock/handlers";
import { runDetail } from "../../mock/fixtures";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OpenApiDoc = any;

let doc: OpenApiDoc;
const ajv = new Ajv2020({ strict: false });
addFormats(ajv);

function successSchemaFor(operationId: string) {
  for (const item of Object.values(doc.paths) as OpenApiDoc[]) {
    for (const operation of Object.values(item) as OpenApiDoc[]) {
      if (operation?.operationId === operationId) {
        const success = Object.entries(operation.responses as Record<string, OpenApiDoc>).find(
          ([code]) => code.startsWith("2"),
        );
        return success?.[1]?.content?.["application/json"]?.schema;
      }
    }
  }
  throw new Error(`operationId not found: ${operationId}`);
}

async function assertMatchesOperation(operationId: string, response: Response) {
  const schema = successSchemaFor(operationId);
  const body = await response.json();
  const validate = ajv.compile(schema);
  const valid = validate(body);
  expect(valid, JSON.stringify(validate.errors)).toBe(true);
}

beforeAll(async () => {
  const contractPath = path.resolve(__dirname, "../../../contract/openapi.yaml");
  doc = await SwaggerParser.dereference(contractPath);
});

describe("mock responses satisfy the OpenAPI contract", () => {
  it("exchangeGithubCode", async () => {
    const res = await fetch(`${API_BASE}/auth/github`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "abc123" }),
    });
    expect(res.status).toBe(200);
    await assertMatchesOperation("exchangeGithubCode", res);
  });

  it("getCurrentUser", async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { authorization: "Bearer mock" },
    });
    expect(res.status).toBe(200);
    await assertMatchesOperation("getCurrentUser", res);
  });

  it("listRepos", async () => {
    const res = await fetch(`${API_BASE}/repos`);
    expect(res.status).toBe(200);
    await assertMatchesOperation("listRepos", res);
  });

  it("listRuns", async () => {
    const res = await fetch(`${API_BASE}/runs`);
    expect(res.status).toBe(200);
    await assertMatchesOperation("listRuns", res);
  });

  it("createRun", async () => {
    const res = await fetch(`${API_BASE}/runs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        repo_id: "repo_01j9zx3fam5q8w2ke7ryn4vht0",
        head_sha: "9f3c2a71b4de806f5a1c9e2d3b47a0c8e6f1d2a3",
        base_sha: "4d8e1f2a9c3b7605e4a2d1c8f9b3a7e60d5c4b1a",
      }),
    });
    expect(res.status).toBe(202);
    await assertMatchesOperation("createRun", res);
  });

  it("getRun", async () => {
    const res = await fetch(`${API_BASE}/runs/${runDetail.id}`);
    expect(res.status).toBe(200);
    await assertMatchesOperation("getRun", res);
  });

  it("listRunObligations", async () => {
    const res = await fetch(`${API_BASE}/runs/${runDetail.id}/obligations`);
    expect(res.status).toBe(200);
    await assertMatchesOperation("listRunObligations", res);
  });

  it("listSpecs", async () => {
    const res = await fetch(`${API_BASE}/specs`);
    expect(res.status).toBe(200);
    await assertMatchesOperation("listSpecs", res);
  });
});
