import { useEffect } from "react";
import SEO from "@/components/SEO";

const CompareEventbritePdf = () => {
  useEffect(() => {
    const html = `
      <html><head><title>Eventbrite vs TeeVents – Comparison</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 40px 32px; }
        @media print { body { padding: 20px; } .no-print { display: none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        .no-print { background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; font-size: 13px; color: #92400e; }
        .no-print strong { color: #78350f; }
        h1 { font-size: 26px; color: #1a5c38; margin-bottom: 4px; }
        .subtitle { color: #666; font-size: 13px; margin-bottom: 24px; }
        .bottom-line { background: #f0f7f3; border: 2px solid #1a5c38; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
        .bottom-line h2 { font-size: 16px; color: #1a5c38; margin-bottom: 8px; }
        .bottom-line p { font-size: 13px; line-height: 1.6; }
        .bottom-line .save { color: #F5A623; font-weight: bold; font-size: 15px; margin-top: 8px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
        th { background: #1a5c38; color: white; padding: 8px 10px; text-align: left; }
        th.eb { background: #dc2626; }
        th.tv { background: #1a5c38; }
        td { padding: 7px 10px; border-bottom: 1px solid #e5e5e5; }
        tr:nth-child(even) { background: #fafafa; }
        .cat { background: #f0f0f0; font-weight: bold; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        .yes { color: #16a34a; } .no { color: #dc2626; } .warn { color: #ea580c; }
        .fee-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
        .fee-box { border: 2px solid; border-radius: 8px; padding: 14px; }
        .fee-box.eb { border-color: #dc2626; }
        .fee-box.tv { border-color: #1a5c38; background: #f0f7f3; }
        .fee-box h3 { font-size: 14px; margin-bottom: 8px; }
        .fee-box.eb h3 { color: #dc2626; }
        .fee-box.tv h3 { color: #1a5c38; }
        .fee-box ul { list-style: none; padding: 0; font-size: 12px; line-height: 1.8; }
        .fee-box .total { border-top: 1px solid; padding-top: 6px; margin-top: 6px; font-weight: bold; font-size: 13px; }
        .reasons { margin: 20px 0; }
        .reasons h2 { font-size: 16px; color: #1a5c38; margin-bottom: 10px; }
        .reasons ol { padding-left: 20px; font-size: 12px; line-height: 1.8; }
        .cta { text-align: center; margin-top: 24px; padding: 20px; background: #1a5c38; border-radius: 8px; color: white; }
        .cta h2 { font-size: 18px; margin-bottom: 6px; }
        .cta p { font-size: 13px; opacity: 0.85; }
        .cta .links { margin-top: 10px; font-size: 13px; }
        .cta a { color: #F5A623; text-decoration: none; font-weight: bold; }
        .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #999; }
      </style></head><body>
        <div class="no-print"><strong>💡 Save as PDF:</strong> In the print dialog, change the destination to <strong>"Save as PDF"</strong>.</div>
        <h1>⛳ Eventbrite vs. TeeVents</h1>
        <p class="subtitle">Why golf tournament organizers choose TeeVents · ${new Date().toLocaleDateString()}</p>

        <div class="bottom-line">
          <h2>The Bottom Line</h2>
          <p>Eventbrite charges <strong>~8.5% total fees</strong> on a $100 registration. TeeVents charges <strong>5% platform + 2.9% + $0.30 Stripe processing = ~8.2%</strong>. Similar total cost, but TeeVents gives you live leaderboards, sponsor management, volunteer check-in, and automatic payouts that Eventbrite simply doesn't offer.</p>
          <p class="save">Lower platform fee + golf-specific features Eventbrite can't match</p>
        </div>

        <table>
          <thead><tr><th style="width:30%">Feature</th><th class="eb" style="width:35%">Eventbrite</th><th class="tv" style="width:35%">TeeVents</th></tr></thead>
          <tbody>
            <tr class="cat"><td colspan="3">Golf-Specific Features</td></tr>
            <tr><td>Live Leaderboard</td><td class="no">✗ Not available</td><td class="yes">✓ Built-in, embeddable</td></tr>
            <tr><td>Hole Sponsors</td><td class="no">✗ Basic logo only</td><td class="yes">✓ Portal with asset delivery</td></tr>
            <tr><td>Team Registration</td><td class="warn">⚠ Clunky workarounds</td><td class="yes">✓ Native group registration</td></tr>
            <tr><td>Handicap Tracking</td><td class="no">✗ Not available</td><td class="yes">✓ Stored per player</td></tr>
            <tr><td>Pairings & Tee Times</td><td class="no">✗ Manual spreadsheets</td><td class="yes">✓ Drag-and-drop</td></tr>
            <tr><td>Volunteer Check-in</td><td class="no">✗ Not available</td><td class="yes">✓ QR code + scheduling</td></tr>

            <tr class="cat"><td colspan="3">Pricing</td></tr>
            <tr><td>Platform Fee</td><td class="warn">3.5% + $1.79/ticket</td><td class="yes">5% flat</td></tr>
            <tr><td>Processing Fee</td><td class="no">2.9% + $0.30 extra</td><td class="warn">2.9% + $0.30 (Stripe)</td></tr>
            <tr><td>Total on $100</td><td class="no">~$8.49</td><td class="yes">$8.20</td></tr>

            <tr class="cat"><td colspan="3">Payouts</td></tr>
            <tr><td>Payout Speed</td><td class="no">After event (slow)</td><td class="yes">Bi-weekly</td></tr>
            <tr><td>Chargeback Protection</td><td class="no">✗ None</td><td class="yes">✓ 15% hold</td></tr>

            <tr class="cat"><td colspan="3">Support</td></tr>
            <tr><td>Customer Support</td><td class="no">AI bots</td><td class="yes">Direct email + phone</td></tr>
            <tr><td>Onboarding Help</td><td class="no">✗ No</td><td class="yes">✓ Free setup</td></tr>
          </tbody>
        </table>

        <div class="fee-grid">
          <div class="fee-box eb">
            <h3>Eventbrite · $100 Registration</h3>
            <ul>
              <li>Platform: 3.5% + $1.79 = $5.29</li>
              <li>Processing: 2.9% + $0.30 = $3.20</li>
              <li class="total">Total: $8.49 (8.5%)</li>
            </ul>
          </div>
          <div class="fee-box tv">
            <h3>TeeVents · $100 Registration</h3>
            <ul>
              <li>Platform: 5% flat = $5.00</li>
              <li>Stripe: 2.9% + $0.30 = $3.20</li>
              <li class="total" style="border-color:#1a5c38">Total: $8.20 (8.2%)</li>
            </ul>
          </div>
        </div>

        <div class="reasons">
          <h2>Why Golf Organizers Switch</h2>
          <ol>
            <li><strong>Lower total fees</strong> — Save $3.49 per golfer vs. Eventbrite</li>
            <li><strong>Golf-specific features</strong> — Leaderboards, pairings, hole sponsors</li>
            <li><strong>Faster payouts</strong> — Bi-weekly automatic deposits</li>
            <li><strong>Real support</strong> — Talk to a human, not a chatbot</li>
            <li><strong>Built for golf</strong> — By tournament organizers, for tournament organizers</li>
          </ol>
        </div>

        <div class="cta">
          <h2>Ready to Switch?</h2>
          <p>Start free or book a live demo to see TeeVents in action.</p>
          <div class="links">
            <a href="https://teevents.golf/get-started">teevents.golf/get-started</a> · 
            <a href="https://calendly.com/teevents-golf/demo">Book a Demo</a> · 
            info@teevents.golf · (602) 413-1338
          </div>
        </div>

        <p class="footer">© ${new Date().getFullYear()} TeeVents Golf Management. All rights reserved.</p>
      </body></html>
    `;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 500);
    window.history.back();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Generating PDF...</p>
    </div>
  );
};

export default CompareEventbritePdf;
