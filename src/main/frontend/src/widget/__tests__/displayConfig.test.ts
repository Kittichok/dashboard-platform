import { describe, expect, it } from "vitest";

import {
  extractSelectableFields,
  filterDataToFields,
  selectedFieldsFromConfig,
  withSelectedFields
} from "../displayConfig";

describe("displayConfig helpers", () => {
  it("extracts top-level fields from object responses", () => {
    expect(extractSelectableFields({ id: 1, name: "Ada", active: true })).toEqual([
      "id",
      "name",
      "active"
    ]);
  });

  it("extracts first-seen fields from array object responses", () => {
    expect(extractSelectableFields([
      { id: 1, name: "Ada" },
      { email: "ada@example.test", name: "Ada Lovelace" }
    ])).toEqual(["id", "name", "email"]);
  });

  it("extracts nested object paths from object responses", () => {
    expect(extractSelectableFields({
      name: "Adeel Solangi",
      language: "Sindhi",
      detail: {
        obj: { key: "value" },
        name: "test"
      }
    })).toEqual([
      "name",
      "language",
      "detail",
      "detail.obj",
      "detail.obj.key",
      "detail.name"
    ]);
  });

  it("extracts first-seen nested paths from array object responses", () => {
    expect(extractSelectableFields([
      {
        id: 1,
        detail: {
          obj: { key: "value" }
        }
      },
      {
        id: 2,
        detail: {
          status: "ok"
        }
      }
    ])).toEqual([
      "id",
      "detail",
      "detail.obj",
      "detail.obj.key",
      "detail.status"
    ]);
  });

  it("does not offer fields for primitive responses", () => {
    expect(extractSelectableFields(null)).toEqual([]);
    expect(extractSelectableFields("ready")).toEqual([]);
    expect(extractSelectableFields(42)).toEqual([]);
  });

  it("filters object responses to selected fields", () => {
    expect(filterDataToFields({ id: 1, name: "Ada", active: true }, ["name", "active"])).toEqual({
      name: "Ada",
      active: true
    });
  });

  it("filters each row in array responses to selected fields", () => {
    expect(filterDataToFields([
      { id: 1, name: "Ada", active: true },
      { id: 2, name: "Grace", active: false }
    ], ["name"])).toEqual([
      { name: "Ada" },
      { name: "Grace" }
    ]);
  });

  it("filters object responses to nested selected fields", () => {
    expect(filterDataToFields({
      name: "Adeel Solangi",
      language: "Sindhi",
      detail: {
        obj: { key: "value", extra: "ignore" },
        name: "test"
      }
    }, ["detail.obj.key", "detail.name"])).toEqual({
      detail: {
        obj: { key: "value" },
        name: "test"
      }
    });
  });

  it("filters each array row to nested selected fields", () => {
    expect(filterDataToFields([
      {
        id: 1,
        detail: {
          obj: { key: "value-1" },
          name: "first"
        }
      },
      {
        id: 2,
        detail: {
          obj: { key: "value-2" },
          name: "second"
        }
      }
    ], ["detail.obj.key"])).toEqual([
      { detail: { obj: { key: "value-1" } } },
      { detail: { obj: { key: "value-2" } } }
    ]);
  });

  it("returns original data when no fields are selected", () => {
    const data = { id: 1, name: "Ada" };
    expect(filterDataToFields(data, [])).toBe(data);
    expect(filterDataToFields(data, undefined)).toBe(data);
  });

  it("reads selected fields from a display config object only", () => {
    expect(selectedFieldsFromConfig({ selectedFields: ["id", "name"] })).toEqual(["id", "name"]);
    expect(selectedFieldsFromConfig({ selectedFields: [1, "name"] })).toEqual([]);
    expect(selectedFieldsFromConfig(null)).toEqual([]);
  });

  it("writes selected fields without mutating existing config", () => {
    const original = { content: "fallback" };
    expect(withSelectedFields(original, ["id"])).toEqual({ content: "fallback", selectedFields: ["id"] });
    expect(original).toEqual({ content: "fallback" });
    expect(withSelectedFields(original, [])).toEqual({ content: "fallback" });
  });
});
