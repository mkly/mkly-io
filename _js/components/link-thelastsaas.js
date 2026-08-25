import { Html } from "mo-js";
import { duration } from "defaults";

export default (() =>
  new Html({
    el: "[x-mkly-link-thelastsaas]",
    y: {
      "30": 0,
      duration,
      delay: 1900,
    },
    opacity: {
      0: 1,
      duration,
      delay: 1900,
    },
  }).play())();
