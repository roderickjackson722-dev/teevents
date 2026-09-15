import { useState } from "react";
import { CheckCircle2, CreditCard, Handshake, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  eventName: string;
  feeCents: number;
  primaryColor: string;
  secondaryColor: string;
}

export default function SampleRegistrationPreview({
  eventName,
  feeCents,
  primaryColor,
  secondaryColor,
}: Props) {
  const [registrationType, setRegistrationType] = useState("individual");
  const playerCount = registrationType === "foursome" ? 4 : 1;
  const total = feeCents * playerCount;

  return (
    <section
      data-tour="registration"
      id="sample-registration"
      className="border-y border-border bg-golf-cream py-10 sm:py-14"
    >
      <div className="mx-auto grid max-w-6xl gap-6 px-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-border bg-card p-5 sm:p-7">
          <div className="mb-6 flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
              style={{ backgroundColor: secondaryColor, color: primaryColor }}
            >
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Player Registration
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The same clear registration flow players use on a live TeeVents
                event.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Registration type</Label>
              <Select
                value={registrationType}
                onValueChange={setRegistrationType}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual golfer</SelectItem>
                  <SelectItem value="foursome">Foursome</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border border-border p-4">
              <h3 className="mb-4 text-sm font-semibold text-foreground">
                Player 1{" "}
                {registrationType === "foursome" ? "(Team Captain)" : ""}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="sample-first-name">First Name *</Label>
                  <Input id="sample-first-name" placeholder="John" />
                </div>
                <div>
                  <Label htmlFor="sample-last-name">Last Name *</Label>
                  <Input id="sample-last-name" placeholder="Smith" />
                </div>
                <div>
                  <Label htmlFor="sample-email">Email *</Label>
                  <Input
                    id="sample-email"
                    type="email"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="sample-phone">Phone</Label>
                  <Input id="sample-phone" placeholder="(555) 123-4567" />
                </div>
                <div>
                  <Label htmlFor="sample-handicap">Handicap</Label>
                  <Input id="sample-handicap" type="number" placeholder="15" />
                </div>
                <div>
                  <Label>Shirt Size</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {["S", "M", "L", "XL", "2XL"].map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sample-company">Company / Organization</Label>
                  <Input id="sample-company" placeholder="Organization name" />
                </div>
                <div>
                  <Label>Skill Level</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Beginner", "Intermediate", "Advanced", "Scratch"].map(
                        (level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor="sample-dietary">Dietary Restrictions</Label>
                <Input id="sample-dietary" placeholder="Optional" />
              </div>
            </div>

            {registrationType === "foursome" && (
              <div className="rounded-md border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                Three additional player sections appear here so the captain can
                register the full foursome together.
              </div>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-lg border border-border bg-card p-5 lg:sticky lg:top-6">
          <h3 className="text-lg font-bold text-foreground">
            Registration Summary
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{eventName}</p>
          <div className="my-5 space-y-3 border-y border-border py-4 text-sm">
            <div className="flex justify-between gap-4">
              <span>
                {registrationType === "foursome"
                  ? "Foursome"
                  : "Individual golfer"}
              </span>
              <span className="font-semibold">${(total / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4 text-muted-foreground">
              <span>Players</span>
              <span>{playerCount}</span>
            </div>
            <div className="flex justify-between gap-4 text-base font-bold">
              <span>Total</span>
              <span>${(total / 100).toFixed(2)}</span>
            </div>
          </div>
          <Button
            type="button"
            className="w-full font-bold"
            style={{ backgroundColor: secondaryColor, color: primaryColor }}
            onClick={() =>
              toast.success("Sample registration complete", {
                description:
                  "A live event continues to secure payment and sends confirmation emails.",
              })
            }
          >
            Continue to Payment <CreditCard className="h-4 w-4" />
          </Button>
          <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: primaryColor }}
            />
            This sample never charges a card or saves entered information.
          </div>

          <div className="mt-6 rounded-lg border border-border bg-muted/30 p-5">
            <div className="mb-3 flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
                style={{ backgroundColor: primaryColor, color: secondaryColor }}
              >
                <Handshake className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Sponsorship
                </h3>
                <p className="text-sm text-muted-foreground">
                  Title sponsor package
                </p>
              </div>
            </div>
            <div className="text-2xl font-bold" style={{ color: primaryColor }}>
              $5,000
            </div>
            <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              <li>Logo on the event page, leaderboard, and mobile scoring</li>
              <li>“This event is sponsored by” placement all day</li>
              <li>Foursome entry and on-course signage</li>
            </ul>
            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full font-bold"
              style={{ borderColor: primaryColor, color: primaryColor }}
              onClick={() =>
                toast.success("Sample sponsorship selected", {
                  description:
                    "A live event collects sponsor details, logo upload, and payment here.",
                })
              }
            >
              Become a Sponsor
            </Button>
          </div>
        </aside>
      </div>
    </section>
  );
}
