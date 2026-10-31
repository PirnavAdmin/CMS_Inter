import React from "react";
export default function FacultySummaryCard({ as: Element = "div", className = "", children, ...props }) { return <Element className={className} {...props}>{children}</Element>; }
