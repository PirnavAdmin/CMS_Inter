import React from "react";
export default function FacultyCard({ as: Element = "div", className = "", children, ...props }) { return <Element className={className} {...props}>{children}</Element>; }
