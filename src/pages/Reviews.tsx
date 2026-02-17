import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import Layout from "@/components/Layout";
import HeroSection from "@/components/HeroSection";
import heroGolf from "@/assets/hero-golf.jpg";

const reviews = [
  {
    text: "As one of the founders of Tap That Ash, I am proud to endorse Rod Jackson and TeeVents on an amazing experience for our 4th Annual Father's Day Event. Previously we have managed and put together the event...and it took a lot of work to pull it off successfully. But, this year Rod and his team were able to take the process to an easier and more profitable level. From the registration process to the small details once golfers arrived at the course, it was a tremendous upgrade. Rod is extremely professional and his team is knowledgeable which showed in every way at the event, and participants stated that they had an outstanding experience. To say that we were pleased is an understatement…we have decided to trust TeeVents and Rod Jackson with our future golf events.",
    author: "Daniel Sterling Davis",
    organization: "Tap That Ash Cigar Club",
  },
];

const Reviews = () => {
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

          {reviews.map((review, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-card rounded-lg p-8 md:p-12 border border-border shadow-sm relative"
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
          ))}

          <p className="text-center text-muted-foreground mt-12 italic">
            Thank You Rod for an unbelievable experience!!!
          </p>
        </div>
      </section>
    </Layout>
  );
};

export default Reviews;
