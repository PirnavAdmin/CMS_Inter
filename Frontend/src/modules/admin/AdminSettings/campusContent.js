export const campusContentDefaults = {
  collegeName: "Pirnav College",
  landingBadge: "A smarter campus starts here",
  landingHeadline: "Learn, grow and succeed with a connected college experience.",
  landingDescription:
    "Bring students, faculty, academics, examinations, fees and administration together in one clear, reliable platform built for Pirnav College.",
  landingBenefit1: "Faster daily operations",
  landingBenefit2: "Clear academic visibility",
  landingBenefit3: "Better student outcomes",
  landingButton: "Get Started",
  landingLoginButton: "Login",
  footerDescription:
    "One connected platform for academics, admissions, administration and student success.",
  contactAddress: "Vijayawada, Andhra Pradesh",
  contactEmail: "support@pirnavcollege.com",
  contactPhone: "+91 9398649798",
  loginCollegeName: "Pirnav College Of Intermediate",
  loginTagline:
    "“Empowering young minds with academic excellence, ethical values, and a strong foundation for a bright future.”",
  loginHeading: "Welcome back",
  loginDescription: "Sign in to the Pirnav College management system.",
  loginButton: "Login",
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
