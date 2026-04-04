import { DollarSign, TrendingUp, Clock, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { sampleFinances, sampleTransactions } from "./sampleData";

const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

const DemoFinancesTab = () => (
  <div className="space-y-6">
    {/* Balance Cards */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { label: "Total Collected", value: sampleFinances.total_collected, icon: DollarSign, color: "text-green-600" },
        { label: "Platform Fees", value: sampleFinances.platform_fees, icon: TrendingUp, color: "text-secondary" },
        { label: "Pending Hold", value: sampleFinances.pending_hold, icon: Clock, color: "text-yellow-600" },
        { label: "Available", value: sampleFinances.available_balance, icon: Wallet, color: "text-foreground" },
      ].map((card) => (
        <Card key={card.label}>
          <CardContent className="pt-6 text-center">
            <card.icon className={`h-7 w-7 mx-auto mb-2 ${card.color}`} />
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className={`text-lg font-bold ${card.color}`}>{fmt(card.value)}</p>
          </CardContent>
        </Card>
      ))}
    </div>

    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
          <Badge variant="outline" className="text-xs">
            Next payout: {sampleFinances.next_payout_date}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-semibold text-muted-foreground">Golfer</th>
                <th className="text-left p-3 font-semibold text-muted-foreground">Date</th>
                <th className="text-right p-3 font-semibold text-muted-foreground">Gross</th>
                <th className="text-right p-3 font-semibold text-muted-foreground">Fee</th>
                <th className="text-right p-3 font-semibold text-muted-foreground">Net</th>
                <th className="text-center p-3 font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {sampleTransactions.map((tx) => (
                <tr key={tx.golfer} className="border-b border-border/50">
                  <td className="p-3 font-medium text-foreground">{tx.golfer}</td>
                  <td className="p-3 text-muted-foreground">{tx.date}</td>
                  <td className="p-3 text-right text-foreground">{fmt(tx.gross)}</td>
                  <td className="p-3 text-right text-muted-foreground">{fmt(tx.fee)}</td>
                  <td className="p-3 text-right font-semibold text-foreground">{fmt(tx.net)}</td>
                  <td className="p-3 text-center">
                    <Badge
                      variant={tx.status === "Paid" ? "default" : "outline"}
                      className="text-xs"
                    >
                      {tx.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default DemoFinancesTab;
