import React from "react";

// Filter out framer-motion specific props so they don't leak to standard DOM elements
const MOTION_PROP_KEYS = new Set([
  "initial",
  "animate",
  "exit",
  "variants",
  "transition",
  "whileHover",
  "whileTap",
  "whileFocus",
  "whileDrag",
  "whileInView",
  "viewport",
  "layout",
  "layoutId",
  "layoutDependency",
  "onAnimationStart",
  "onAnimationComplete",
  "transformTemplate",
  "custom",
  "drag",
  "dragConstraints",
  "dragElastic",
  "dragMomentum",
]);

function createMotionComponent(tagName) {
  const Component = React.forwardRef(function MotionComponent(props, ref) {
    const domProps = {};
    for (const [key, val] of Object.entries(props)) {
      if (!MOTION_PROP_KEYS.has(key)) {
        domProps[key] = val;
      }
    }
    return React.createElement(tagName, { ...domProps, ref });
  });
  Component.displayName = `motion.${tagName}`;
  return Component;
}

export const motion = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop === "string") {
        return createMotionComponent(prop);
      }
      return undefined;
    },
  }
);

export function useReducedMotion() {
  return false;
}

export function useAnimation() {
  return {
    start: () => Promise.resolve(),
    set: () => {},
    stop: () => {},
  };
}

export function AnimatePresence({ children }) {
  return children;
}

export default {
  motion,
  useReducedMotion,
  useAnimation,
  AnimatePresence,
};
