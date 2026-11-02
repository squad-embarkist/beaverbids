// The column labels of the CanadaBuys open tender notices file, as the data
// dictionary (achatscanada-canadabuys-dd.xml) names them. The parser refuses
// a file whose header lacks any of these, so a renamed column fails the run
// with the missing names instead of skipping every row.
export const COLUMNS = {
  titleEn: "title-titre-eng",
  titleFr: "title-titre-fra",
  referenceNumber: "referenceNumber-numeroReference",
  solicitationNumber: "solicitationNumber-numeroSollicitation",
  amendmentNumber: "amendmentNumber-numeroModification",
  amendmentDate: "amendmentDate-dateModification",
  publicationDate: "publicationDate-datePublication",
  closingDate: "tenderClosingDate-appelOffresDateCloture",
  status: "tenderStatus-appelOffresStatut-eng",
  gsin: "gsin-nibs",
  unspsc: "unspsc",
  procurementCategory: "procurementCategory-categorieApprovisionnement",
  noticeType: "noticeType-avisType-eng",
  regionsOfOpportunity: "regionsOfOpportunity-regionAppelOffres-eng",
  regionsOfDelivery: "regionsOfDelivery-regionsLivraison-eng",
  entityName: "contractingEntityName-nomEntitContractante-eng",
  entityProvince: "contractingEntityAddressProvince-entiteContractanteAdresseProvince-eng",
  noticeUrl: "noticeURL-URLavis-eng",
  descriptionEn: "tenderDescription-descriptionAppelOffres-eng",
  descriptionFr: "tenderDescription-descriptionAppelOffres-fra",
} as const;

export type ColumnKey = keyof typeof COLUMNS;

// The contracting officer's contact columns. Blanked in the fixture sample
// before it was committed, and never read by the adapter.
export const CONTACT_COLUMNS = [
  "contactInfoName-informationsContactNom",
  "contactInfoEmail-informationsContactCourriel",
  "contactInfoPhone-contactInfoTelephone",
  "contactInfoFax",
  "contactInfoAddressLine-contactInfoAdresseLigne-eng",
  "contactInfoAddressLine-contactInfoAdresseLigne-fra",
] as const;
