import { createFileRoute } from "@tanstack/react-router";
import TemplateWorkspace from "@/components/proposal-web/TemplateWorkspace";
const title="Proposal Template | TeeVents";
const description="Private TeeVents client proposal template for golf tournament programs and services.";
export const Route=createFileRoute("/proposal-template")({
 ssr:false,
 head:()=>({meta:[{title},{name:"description",content:description},{name:"robots",content:"noindex, nofollow, noarchive"},{property:"og:title",content:title},{property:"og:description",content:description},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}],links:[{rel:"referrer",href:"no-referrer"}]}),
 component:TemplateWorkspace,
});