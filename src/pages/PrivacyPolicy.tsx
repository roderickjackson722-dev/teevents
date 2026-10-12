import LegalPage from "@/components/marketing/LegalPage";
import { PRIVACY_SECTIONS } from "@/data/legalContent";
export default function PrivacyPolicy() { return <LegalPage title="Privacy Policy" sections={PRIVACY_SECTIONS} email="privacy@teevents.golf" />; }
