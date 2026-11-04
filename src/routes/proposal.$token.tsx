import { createFileRoute } from "@tanstack/react-router";
import ProposalPage from "@/components/proposal-web/ProposalPage";
import { readWebDocument } from "@/components/proposal-web/proposalWeb.functions";
const title="Golf Tournament Proposal | TeeVents";
const description="A private TeeVents proposal outlining tournament programs, services and next steps.";
export const Route=createFileRoute("/proposal/$token")({
 loader:({params})=>readWebDocument({data:{token:params.token}}),
 head:()=>({meta:[{title},{name:"description",content:description},{name:"robots",content:"noindex, nofollow, noarchive"},{name:"referrer",content:"no-referrer"},{property:"og:title",content:title},{property:"og:description",content:description},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}]}),
 errorComponent:()=> <main className="mx-auto max-w-xl p-8"><h1 className="font-display text-3xl">Proposal unavailable</h1><p className="mt-5">This private proposal link is unavailable. Contact info@teevents.golf.</p></main>,
 component:ClientProposal,
});
function ClientProposal(){const d=Route.useLoaderData();const {token}=Route.useParams();if(!d)return <main className="mx-auto max-w-xl p-8"><h1 className="font-display text-3xl">Proposal unavailable</h1><p className="mt-5">This private proposal link is unavailable. Contact info@teevents.golf.</p></main>;return <ProposalPage document={d} token={token}/>;}