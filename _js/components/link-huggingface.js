import { Html } from "mo-js";
import { duration } from "defaults";

export default (() =>
  new Html({
    el: "[x-mkly-link-huggingface]",
    y: {
      "30": 0,
      duration,
      delay: 1300,
    },
    opacity: {
      0: 1,
      duration,
      delay: 1300,
    },
  }).play())();
