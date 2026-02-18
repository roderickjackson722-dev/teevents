import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, Quote, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import HeroSection from "@/components/HeroSection";
import heroGolf from "@/assets/hero-golf.jpg";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  id: string;
  text: string;
  author: string;
  organization: string;
  sort_order: number;
}

const Reviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .order("sort_order", { ascending: true });
      setReviews((data as Review[]) || []);
      setLoading(false);
    };
    fetchReviews();
  }, []);

  return (
    <Layout>
      <HeroSection
        backgroundImage={heroGolf}
        title="Reviews"
        subtitle="See what our clients have to say"
        height="h-[50vh]"
      />

      <section className="bg-golf-cream py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex justify-center gap-1 mb-12">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-6 w-6 fill-secondary text-secondary" />
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-center text-muted-foreground italic">No reviews yet.</p>
          ) : (
            reviews.map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-card rounded-lg p-8 md:p-12 border border-border shadow-sm relative mb-8"
              >
                <Quote className="h-10 w-10 text-secondary/30 absolute top-6 left-6" />
                <p className="text-foreground/80 leading-relaxed text-base md:text-lg italic mt-4">
                  "{review.text}"
                </p>
                <div className="mt-8 pt-6 border-t border-border">
                  <p className="font-display font-semibold text-primary text-lg">
                    {review.author}
                  </p>
                  <p className="text-muted-foreground text-sm">{review.organization}</p>
                </div>
              </motion.div>
            ))
          )}

          <p className="text-center text-muted-foreground mt-12 italic">
            Thank You Rod for an unbelievable experience!!!
          </p>
        </div>
      </section>
    </Layout>
  );
};

export default Reviews;
