import { Html } from "mo-js";
import { duration } from "defaults";

export default (() =>
  new Html({
    el: "[x-mkly-link-github]",
    y: {
      "20": 0,
      duration,
      delay: 600,
    },
    opacity: {
      0: 1,
      duration,
      delay: 600,
    },
  }).play())();
