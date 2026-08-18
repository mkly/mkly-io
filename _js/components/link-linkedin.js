import { Html } from "mo-js";
import { duration } from "defaults";

export default (() =>
  new Html({
    el: "[x-mkly-link-linkedin]",
    y: {
      "30": 0,
      duration,
      delay: 1500,
    },
    opacity: {
      0: 1,
      duration,
      delay: 1500,
    },
  }).play())();
