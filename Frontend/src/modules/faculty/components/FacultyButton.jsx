import React from "react";
export default function FacultyButton({ as: Element = "div", className = "", children, ...props }) { return <Element className={className} {...props}>{children}</Element>; }
