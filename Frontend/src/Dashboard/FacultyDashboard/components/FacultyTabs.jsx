import React from "react";
export default function FacultyTabs({ as: Element = "div", className = "", children, ...props }) { return <Element className={className} {...props}>{children}</Element>; }
