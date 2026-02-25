// Comprehensive skill types organized by category
export const skillCategories = {
  "Construction & Repair Trades": [
    "Mechanic (Vehicle)",
    "Mechanic (Motor Bike)",
    "Electrician",
    "Plumber",
    "Carpenter",
    "Furniture",
    "Bricklayer",
    "Mason",
    "Welder",
    "Fabricator",
    "Painter",
    "Home Decorator",
    "Frame Maker"
  ],
  "Home & Property Services": [
    "Roof Installer",
    "Tiler",
    "Glazier (Glass Cutting)",
    "AC Technician",
    "Fence Installer",
    "Gate Installer",
    "Cleaner",
    "Interior Decorator",
    "Laundry Services",
    "Pest Control Technician"
  ],
  "Personal & Everyday Services": [
    "Tailor",
    "Seamstress",
    "Fashion Designer",
    "Fashion Stylist",
    "Barber",
    "Hairdresser / Hair Stylist",
    "Beautician",
    "Makeup Artist",
    "Pedicurist",
    "Manicurist",
    "Gele Tying",
    "Tattoo Artist",
    "Aso-Oke Specialist",
    "Maid (Home Helper)",
    "Dry Cleaner",
    "Errand Services"
  ],
  "Events & Hospitality": [
    "Catering and Baking",
    "Chef",
    "Baker",
    "Cocktail Services",
    "Event Planner",
    "Event Host / MC",
    "Event Decorator",
    "Event Security / Crowd Control",
    "Ushers",
    "Event Rentals / Party Rentals",
    "Event Centre / Hall",
    "Gift Packaging",
    "Souvenir Maker",
    "Event Branding"
  ],
  "Entertainment & Creative Arts": [
    "Actor / Actress",
    "Artist",
    "Singer",
    "Musician",
    "Animator",
    "Storyboard Artist",
    "Dance Choreography",
    "DJ",
    "Live Band",
    "Music Producer",
    "Sound Engineer / Technician",
    "Voice-over Artist / Voice Coach",
    "Model / Movie Extras",
    "Scriptwriter",
    "Creative Director",
    "Stylist",
    "Bead Maker"
  ],
  "Tech, Media & Digital Services": [
    "Software Developer",
    "Web Developer",
    "Mobile App Developer",
    "UX Specialist",
    "Website Manager",
    "Data Analyst",
    "Graphic Designer",
    "Brand Designer",
    "SEO Specialist",
    "Social Media Manager",
    "AI Content Creator",
    "Podcast Creator",
    "Video Editor",
    "Videographer",
    "Drone Operator",
    "Photographer",
    "Brand Photographer",
    "Content Creator",
    "Blogger",
    "Copywriter",
    "Computer Technician",
    "Phone Technician",
    "Satellite Cable Installer"
  ],
  "Professional & Business Services": [
    "Project Management",
    "Account Management",
    "Customer Support",
    "Virtual Assistant",
    "Tutoring",
    "Email Marketing"
  ],
  "Transport & Logistics": [
    "Vehicle Driver",
    "Motor Bike Driver / Dispatch Rider",
    "Logistics Services"
  ]
};

// Flatten all skills into a single array for dropdown
export const allSkills = Object.entries(skillCategories).flatMap(([category, skills]) => 
  skills.map(skill => ({ category, skill }))
);

// Get all unique skill names
export const skillNames = allSkills.map(s => s.skill);

// Charge rate types
export const chargeRateTypes = [
  "Per Hour",
  "Per Day",
  "Contract",
  "Not Fixed"
];
