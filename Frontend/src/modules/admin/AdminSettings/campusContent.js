export const campusContentDefaults = {
  collegeName: "Pirnav College",
  landingBadge: "A Smarter Campus Starts Here",
  landingHeadline: "Learn. Grow. Succeed Together. A Connected College Experience.",
  landingDescription:
    "PIRNAV Intermediate College Management System brings students, faculty, academics and administration together in one integrated platform for better education and brighter futures.",
  landingBenefit1: "Faster daily operations",
  landingBenefit2: "Clear academic visibility",
  landingBenefit3: "Better student outcomes",
  landingButton: "Get Started",
  landingLoginButton: "Login",
  footerDescription:
    "One connected platform for academics, admissions, administration and student success.",
  contactAddress: "Dwarakapuram, Pirnav, Nizamabad, Telangana - 503224",
  contactEmail: "pirnavjuniorcollege@gmail.com",
  contactPhone: "+91 9908364909",
  loginCollegeName: "Pirnav College Of Intermediate",
  loginTagline:
    "“Empowering young minds with academic excellence, ethical values, and a strong foundation for a bright future.”",
  loginHeading: "Welcome back",
  loginDescription: "Sign in to the Pirnav College management system.",
  loginButton: "Login",
  loginThemePalette: "olive",
  loginCustomColor: "",
};
export const campusTextFields = {
  landing: [
    ["collegeName", "College Name"],
    ["landingBadge", "Introductory Badge Text"],
    ["landingHeadline", "Main Headline", "textarea"],
    ["landingDescription", "Description", "textarea"],
    ["landingBenefit1", "Benefit 1"],
    ["landingBenefit2", "Benefit 2"],
    ["landingBenefit3", "Benefit 3"],
    ["landingButton", "Get Started Button Text"],
    ["landingLoginButton", "Header Login Button Text"],
    ["footerDescription", "Footer Description", "textarea"],
    ["contactAddress", "Contact Address"],
    ["contactEmail", "Contact Email", "email"],
    ["contactPhone", "Contact Phone", "tel"],
  ],
  login: [
    ["loginCollegeName", "College Name / Login Title"],
    ["loginTagline", "College Tagline", "textarea"],
    ["loginHeading", "Login Form Heading"],
    ["loginDescription", "Login Form Description", "textarea"],
    ["loginButton", "Login Button Text"],
  ],
};
export const getCampusContent = (configuration = {}) =>
  Object.fromEntries(
    Object.entries(campusContentDefaults).map(([key, value]) => [key, configuration[key] ?? value]),
  );
