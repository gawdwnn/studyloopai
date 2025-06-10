"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";

const testimonials = [
  {
    quote:
      "StudyLoop enables me to customise and supercharge my learning by focusing on actually understanding the content rather than spending time and energy on tedious note-taking without proper digestion.",
    author: "Martin",
    rating: 5,
    avatar: "M",
  },
  {
    quote:
      "The AI-powered study tools have completely transformed how I approach learning. My retention has improved dramatically.",
    author: "Sarah Chen",
    rating: 5,
    avatar: "S",
  },
  {
    quote:
      "Finally, a platform that understands how modern students learn. The personalized approach is game-changing.",
    author: "Alex Rodriguez",
    rating: 5,
    avatar: "A",
  },
];

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Hero/Testimonial Section - Hidden on mobile */}
      <motion.div
        className="hidden md:flex md:w-2/5 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-700 relative overflow-hidden flex-col justify-center items-center p-8 lg:p-12 min-h-[40vh] md:min-h-screen"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-32 h-32 bg-white rounded-full blur-xl" />
          <div className="absolute bottom-20 right-20 w-24 h-24 bg-white rounded-full blur-lg" />
          <div className="absolute top-1/2 left-10 w-16 h-16 bg-white rounded-full blur-md" />
        </div>

        {/* Testimonial */}
        <AnimatePresence mode="wait">
          <motion.div
            className="max-w-sm lg:max-w-md text-center text-white z-10"
            key={currentTestimonial}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-4 lg:mb-6">
              <div className="flex justify-center mb-2 lg:mb-3">
                {Array.from(
                  { length: testimonials[currentTestimonial].rating },
                  (_, i) => (
                    <Star
                      key={`${testimonials[currentTestimonial].author}-star-${i}`}
                      className="w-4 h-4 lg:w-5 lg:h-5 fill-yellow-400 text-yellow-400"
                    />
                  )
                )}
              </div>
              <blockquote className="text-sm lg:text-lg xl:text-xl leading-relaxed mb-3 lg:mb-4 italic">
                "{testimonials[currentTestimonial].quote}"
              </blockquote>
              <div className="flex items-center justify-center space-x-2 lg:space-x-3">
                <div className="w-8 h-8 lg:w-12 lg:h-12 bg-white/20 rounded-full flex items-center justify-center font-semibold text-sm lg:text-base">
                  {testimonials[currentTestimonial].avatar}
                </div>
                <span className="font-medium text-sm lg:text-base">
                  {testimonials[currentTestimonial].author}
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Testimonial Indicators */}
        <div className="flex justify-center space-x-2 mt-4">
          {testimonials.map((testimonial, index) => (
            <button
              key={`indicator-${testimonial.author}`}
              type="button"
              onClick={() => setCurrentTestimonial(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentTestimonial ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>

        {/* Stats */}
        <motion.div
          className="absolute bottom-4 left-4 right-4 lg:bottom-8 lg:left-8 lg:right-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <div className="flex justify-center space-x-6 lg:space-x-8 text-white/80 text-xs lg:text-sm">
            <div className="text-center">
              <div className="font-bold text-lg lg:text-xl">10K+</div>
              <div>Students</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg lg:text-xl">4.9★</div>
              <div>Rating</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg lg:text-xl">95%</div>
              <div>Success Rate</div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Right Side - Form Section */}
      <motion.div
        className="md:w-3/5 bg-background flex flex-col justify-center p-6 lg:p-8 xl:p-12"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
