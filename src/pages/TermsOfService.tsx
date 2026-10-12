import LegalPage from "@/components/marketing/LegalPage";
import { TERMS_SECTIONS } from "@/data/legalContent";
export default function TermsOfService() { return <LegalPage title="Terms of Service" sections={TERMS_SECTIONS} email="legal@teevents.golf" />; }
