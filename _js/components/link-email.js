import { Html } from 'mo-js';
import { duration } from 'defaults';

export default (() => new Html({

  el: '[x-mkly-link-email]',
  y: {
    '30': 0,
    duration,
    delay: 400
  },
  opacity: {
    0: 1,
    duration,
    delay: 400
  }

}).play())();
