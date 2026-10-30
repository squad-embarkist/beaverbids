import { describe, expect, it } from "vitest";
import { buyerTypeFor } from "./buyers";

describe("buyerTypeFor", () => {
  it.each([
    "Department of National Defence (DND)",
    "Department of National Defence",
    "Minister of National Defence",
    "Defence Construction Canada - Atlantic Region",
    "Defence Construction Canada / Construction de Défense Canada",
    "Royal Canadian Mounted Police (RCMP)",
    "Correctional Service of Canada (CSC)",
    "Department of Public Safety and Emergency Preparedness (PS)",
    "Defence Research and Development Canada (DRDC)",
    "Parliamentary Protective Service (PPS)",
  ])("%s is defence and public safety", (name) => {
    expect(buyerTypeFor(name)).toEqual({ type: "defence-public-safety", known: true });
  });

  it.each([
    "Canada Post Corporation",
    "Business Development Bank of Canada",
    "Export Development Canada - EDC",
    "VIA Rail Canada Inc.",
    "Canada Mortgage and Housing Corporation (CNHC)",
    "Farm Credit Canada (FCC)",
    "Bank of Canada",
    "Marine Atlantic",
    "Canada Lands Company Limited (CLC)",
    "Canada Deposit Insurance Corporation (CDIC)",
    "Destination Canada (DC)",
    "National Capital Commission (NCC)",
    "Canada Council for the Arts",
    "Standards Council of Canada (SCC-CCN)",
  ])("%s is a Crown corporation", (name) => {
    expect(buyerTypeFor(name)).toEqual({ type: "crown-utility", known: true });
  });

  it("maps the Government of the Northwest Territories to provincial", () => {
    expect(buyerTypeFor("Government of the Northwest Territories (GNWT)")).toEqual({ type: "provincial", known: true });
  });

  it.each([
    "Department of Public Works and Government Services (PSPC)",
    "Public Works and Government Services Canada",
    "Shared Services Canada",
    "National Research Council of Canada (NRC)",
    "Parks Canada Agency (PC)",
    "Canadian Nuclear Safety Commission (CNSC)",
    "Office of the Auditor General (OAG)",
    "House of Commons",
    "Immigration and Refugee Board (IRB)",
    "Statistics Canada (StatCan)",
    "Courts Administration Service (CAS)",
    "Foreign Affairs, Trade And Development (Department Of)",
  ])("%s is federal", (name) => {
    expect(buyerTypeFor(name)).toEqual({ type: "federal", known: true });
  });

  it("defaults an unknown entity to federal and reports it", () => {
    expect(buyerTypeFor("Acme Procurement Office")).toEqual({ type: "federal", known: false });
    expect(buyerTypeFor("")).toEqual({ type: "federal", known: false });
  });
});
