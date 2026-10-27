import { describe, expect, it } from "vitest";
import { certificationCodesFor, detectSetAside, extractRequirements, normalizeText } from "./requirements";

function extract(description: string, title = "Notice") {
  return extractRequirements({ title, description });
}

describe("normalizeText", () => {
  it("lower-cases, strips accents and collapses whitespace", () => {
    expect(normalizeText("  Centre de Données\n  sécurisé, data-centre ")).toBe("centre de donnees securise, data centre");
  });
});

describe("extractRequirements", () => {
  it.each([
    ["SOC 2 Type II or ISO 27001", ["SOC 2", "ISO 27001"]],
    ["certified to ISO/IEC 27001:2022", ["ISO 27001"]],
    ["ISO 9001 quality system", ["ISO 9001"]],
    ["Professional engineering licence in Ontario required", ["P.Eng."]],
    ["Health Canada licences required", ["Health Canada licence"]],
    ["Les plans doivent être signés par un ingénieur agréé", ["P.Eng."]],
    ["Le soumissionnaire doit être membre de l'Ordre des ingénieurs du Québec", ["P.Eng."]],
    ["Le gestionnaire de projet travaillera avec l'ingénieur du ministère", []],
    ["No certification named", []],
  ])("certifications in %j", (text, expected) => {
    expect(extract(text).certifications).toEqual(expected);
  });

  it.each([
    ["post a performance bond", true],
    ["A 10% bid bond is required", true],
    ["Une garantie de soumission de 10 % est exigée", true],
    ["bonding capacity is an asset", true],
    ["James Bond is not mentioned", false],
  ])("bondRequired for %j is %s", (text, expected) => {
    expect(extract(text).bondRequired).toBe(expected);
  });

  it.each([
    ["valid security clearance at the Reliability level", true],
    ["Secret clearance required for the project lead", true],
    ["enhanced reliability screening", true],
    ["staff require a criminal record check", false],
  ])("clearanceRequired for %j is %s", (text, expected) => {
    expect(extract(text).clearanceRequired).toBe(expected);
  });

  it.each([
    ["Data must stay in Canada.", true],
    ["migration to a Canadian cloud region", true],
    ["Data residency in Canada is mandatory", true],
    ["Hosted in Canada, WCAG 2.1 AA", true],
    ["data sovereignty requirements", true],
    ["offices across Canada", false],
  ])("residencyCanada for %j is %s", (text, expected) => {
    expect(extract(text).residencyCanada).toBe(expected);
  });

  it.each([
    ["24 hours a day with a 15-minute response", true],
    ["a 24/7 network operations centre", true],
    ["Business hours coverage with an after-hours on-call option", true],
    ["365 days a year", true],
    ["24-hour emergency delivery to 90 sites", true],
    ["24 hour support line", true],
    ["Monthly reporting", false],
    ["Bidders must give 24-hour notice before site visits", false],
    ["Questions received within 24 hours of the closing date will not be answered", false],
  ])("afterHours for %j is %s", (text, expected) => {
    expect(extract(text).afterHours).toBe(expected);
  });

  it.each([
    ["provide three references of similar size", true],
    ["must show municipal or transit references", true],
    ["at least two prior EHR deployments of comparable size", true],
    ["Prior hospital experience is mandatory", true],
    ["Bidders must provide a reference for each project listed", true],
    ["Two client references and one reference letter", true],
    ["Three-year term", false],
    ["The Terms of Reference are attached as Annex A", false],
    ["Quote the reference number on all correspondence", false],
    ["Drawings are provided for reference only", false],
    ["References to the National Building Code mean the 2020 edition", false],
    ["Pricing is cross referenced with Annex B; see also the list of cross references", false],
  ])("referencesRequired for %j is %s", (text, expected) => {
    expect(extract(text).referencesRequired).toBe(expected);
  });

  it.each([
    ["Bilingual service required", true],
    ["User support must be offered in English and French", true],
    ["Deliverables will be submitted in both official languages", true],
    ["Training in English and French for 300 staff", true],
    ["application mobile bilingue", true],
    ["Les rapports doivent être fournis en anglais et en français", true],
    ["English only", false],
    ["This notice is available in English and French", false],
    ["Cet avis est disponible en anglais et en français", false],
    ["Documents are available in both official languages on request", false],
  ])("bilingualRequired for %j is %s", (text, expected) => {
    expect(extract(text).bilingualRequired).toBe(expected);
  });

  it("records the matched spelling of each category keyword", () => {
    const hits = extract("Run the help desk, network and cloud infrastructure. Data-centre consolidation.").keywordHits;
    expect(hits["it-managed-services-cloud"]).toEqual(["help desk", "cloud", "network", "data centre"]);
  });

  it.each([
    ["Janitorial Services for Municipal Buildings", "custom-software-saas", "build"],
    ["a 20-year capital program", "custom-software-saas", "api"],
    ["sealift to remote communities", "facilities-janitorial", "sealift"],
  ])("does not match %j as the keyword %j inside a longer word", (text, category, keyword) => {
    expect(extract(text).keywordHits[category as "custom-software-saas"] ?? []).not.toContain(keyword);
  });

  it.each([
    ["We build portals and open APIs", "custom-software-saas", ["portal", "build", "api"]],
    ["Managed networks across 12 sites", "it-managed-services-cloud", ["network"]],
  ])("matches whole words and plurals in %j", (text, category, expected) => {
    expect(extract(text).keywordHits[category as "custom-software-saas"]).toEqual(expected);
  });

  it("finds no keywords in unrelated text", () => {
    expect(extract("Supply of office chairs.").keywordHits["it-managed-services-cloud"]).toBeUndefined();
  });
});

describe("detectSetAside", () => {
  it.each([
    ["this procurement is set aside for indigenous businesses under the procurement strategy for indigenous business.", "indigenous businesses"],
    ["set-aside under the psib.", "psib"],
    ["this procurement is reserved for the canadian aboriginal businesses listed in the directory.", "canadian aboriginal businesses listed in the directory"],
    ["the opportunity is reserved for indigenous businesses under psib.", "indigenous businesses"],
    ["ce marche est reserve aux entreprises autochtones.", "entreprises autochtones"],
    ["cette demande de propositions est reservee aux fournisseurs autochtones.", "fournisseurs autochtones"],
    ["the requirement will be subject to the set aside under the federal government procurement strategy for aboriginal business (psab).", "federal government procurement strategy for aboriginal business"],
  ])("detects %j", (text, group) => {
    expect(detectSetAside(text)).toBe(group);
  });

  it.each([
    "indigenous-owned proponents are encouraged.",
    "this procurement is set aside from the international trade agreements under the provision each has for set asides for small and minority businesses.",
    "responses are limited to 20 pages.",
    "the budget set aside for this work is $1m.",
    "funding has been set aside for this project.",
    "time is set aside for questions at the end of the site visit.",
    "the boardroom is reserved for the evaluation committee.",
    "parking is reserved for staff; bidders must use the visitor lot.",
    "the loading dock is reserved for contractors between 7 and 9 am.",
    "a lane on the site is reserved for suppliers delivering under the contract.",
    "le quai de chargement est reserve aux entrepreneurs.",
    "participation is limited to small and medium enterprises.",
    "this procurement is set aside for canadian small and medium enterprises.",
    "reserved for small businesses under the small business set aside program.",
    "ce marche est reserve aux petites et moyennes entreprises.",
  ])("ignores %j", (text) => {
    expect(detectSetAside(text)).toBeNull();
  });

  it("takes the first clause that names a group, not the first clause", () => {
    expect(detectSetAside("funding is set aside for this work. the contract is set aside for indigenous businesses.")).toBe("indigenous businesses");
  });

  it("still flags a conditional set-aside, pending the follow-up in the plan", () => {
    expect(detectSetAside("tenders may be set aside for indigenous businesses in accordance with the psib.")).toBe("indigenous businesses");
  });
});

describe("certificationCodesFor", () => {
  it.each([
    ["SOC 2 Type II", ["SOC 2"]],
    ["ISO/IEC 27001:2022", ["ISO 27001"]],
    ["ISO 27001", ["ISO 27001"]],
    ["P.Eng. (Ontario)", ["P.Eng."]],
    ["COR safety certification", []],
  ])("maps %j to %j", (text, codes) => {
    expect(certificationCodesFor(text)).toEqual(codes);
  });
});
