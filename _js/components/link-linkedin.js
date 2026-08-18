import { Html } from "mo-js";
import { duration } from "defaults";

export default (() =>
  new Html({
    el: "[x-mkly-link-linkedin]",
    y: {
      "25": 0,
      duration,
      delay: 700,
    },
    opacity: {
      0: 1,
      duration,
      delay: 700,
    },
  }).play())();
