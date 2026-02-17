import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  FileText, Hotel, Calendar, Users, Flag, MapPin,
  ClipboardList, Phone, LogOut, ExternalLink
} from "lucide-react";
import Layout from "@/components/Layout";

const resources = [
  {
    title: "Tournament Info",
    description: "General tournament information and guidelines",
    icon: FileText,
    href: "#", // Replace with Google Docs link
  },
  {
    title: "Hotel / Lodging",
    description: "Recommended hotels and lodging options",
    icon: Hotel,
    href: "#",
  },
  {
    title: "Schedule",
    description: "Full tournament schedule and timeline",
    icon: Calendar,
    href: "#",
  },
  {
    title: "Pairings",
    description: "Team and player pairings information",
    icon: Users,
    href: "#",
  },
  {
    title: "Pin Sheets",
    description: "Course pin positions and details",
    icon: Flag,
    href: "#",
  },
  {
    title: "Course Map",
    description: "Golf course layout and directions",
    icon: MapPin,
    href: "#",
  },
  {
    title: "Rules & Regulations",
    description: "Tournament rules and code of conduct",
    icon: ClipboardList,
    href: "#",
  },
  {
    title: "Emergency Contacts",
    description: "Important phone numbers and contacts",
    icon: Phone,
    href: "#",
  },
];

const Dashboard = () => {
  return (
    <Layout>
      <section className="bg-primary py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold text-primary-foreground">
                Coaches Dashboard
              </h1>
              <p className="text-primary-foreground/70 mt-1">
                College Tournament Resources
              </p>
            </div>
            <Link
              to="/"
              className="flex items-center gap-2 text-primary-foreground/70 hover:text-secondary transition-colors text-sm"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-golf-cream py-12 min-h-[60vh]">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {resources.map((resource, i) => (
              <motion.a
                key={resource.title}
                href={resource.href}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group bg-card rounded-lg border border-border p-6 hover:shadow-md hover:border-secondary/50 transition-all"
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
                  <resource.icon className="h-6 w-6 text-primary group-hover:text-secondary transition-colors" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-1 flex items-center gap-2">
                  {resource.title}
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-xs text-muted-foreground">{resource.description}</p>
              </motion.a>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-12">
            Links will open the corresponding Google Doc in a new tab.
            Contact the tournament organizer if any links are not working.
          </p>
        </div>
      </section>
    </Layout>
  );
};

export default Dashboard;
