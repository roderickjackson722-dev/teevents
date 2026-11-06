import { ClientOnly, createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
const App=lazy(()=>import('@/App'));
const title='Send Organizer Emails | TeeVents';
const description='Send event emails, reminders and receipts to your participants.';
export const Route=createFileRoute('/dashboard/email-send')({head:()=>({meta:[{title},{name:'description',content:description},{name:'robots',content:'noindex, nofollow'},{property:'og:title',content:title},{property:'og:description',content:description},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),component:()=> <ClientOnly><Suspense><App/></Suspense></ClientOnly>});