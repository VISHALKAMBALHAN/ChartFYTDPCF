import { mergeUniqueRows } from "./DataverseService";
import { OpportunityRow } from "../models/Types";

describe("mergeUniqueRows", () => {
  it("keeps only new opportunity ids when paging loads duplicate rows", () => {
    const existing: OpportunityRow[] = [
      { id: "1", name: "First", customer: "A", email: "", closeDate: null, revenue: 10, owner: "Owner", status: "Won", statusValue: 1 },
      { id: "2", name: "Second", customer: "B", email: "", closeDate: null, revenue: 20, owner: "Owner", status: "Won", statusValue: 1 }
    ];

    const incoming: OpportunityRow[] = [
      { id: "2", name: "Second", customer: "B", email: "", closeDate: null, revenue: 20, owner: "Owner", status: "Won", statusValue: 1 },
      { id: "3", name: "Third", customer: "C", email: "", closeDate: null, revenue: 30, owner: "Owner", status: "Won", statusValue: 1 }
    ];

    expect(mergeUniqueRows(existing, incoming)).toEqual([
      { id: "1", name: "First", customer: "A", email: "", closeDate: null, revenue: 10, owner: "Owner", status: "Won", statusValue: 1 },
      { id: "2", name: "Second", customer: "B", email: "", closeDate: null, revenue: 20, owner: "Owner", status: "Won", statusValue: 1 },
      { id: "3", name: "Third", customer: "C", email: "", closeDate: null, revenue: 30, owner: "Owner", status: "Won", statusValue: 1 }
    ]);
  });
});
