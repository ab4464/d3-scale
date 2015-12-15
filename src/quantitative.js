import {bisect} from "d3-array";
import {value, round} from "d3-interpolate";
import {map, slice} from "./array";
import constant from "./constant";
import number from "./number";

var unit = [0, 1];

export function deinterpolateLinear(a, b) {
  return (b -= (a = +a))
      ? function(x) { return (x - a) / b; }
      : constant(isNaN(b) ? NaN : 0);
};

function deinterpolateClamp(deinterpolate) {
  return function(a, b) {
    var d = deinterpolate(a, b);
    return function(x) { return Math.max(0, Math.min(1, d(x))); };
  };
}

function bimap(domain, range, deinterpolate, reinterpolate) {
  var d = deinterpolate(domain[0], domain[1]),
      r = reinterpolate(range[0], range[1]);
  return function(x) { return r(d(x)); };
}

function polymap(domain, range, deinterpolate, reinterpolate) {
  var j = Math.min(domain.length, range.length) - 1,
      d = new Array(j),
      r = new Array(j),
      i = -1;

  // Reverse descending domains.
  if (domain[j] < domain[0]) {
    domain = domain.slice().reverse();
    range = range.slice().reverse();
  }

  while (++i < j) {
    d[i] = deinterpolate(domain[i], domain[i + 1]);
    r[i] = reinterpolate(range[i], range[i + 1]);
  }

  return function(x) {
    var i = bisect(domain, x, 1, j) - 1;
    return r[i](d[i](x));
  };
}

export function copy(source, target) {
  return target
      .domain(source.domain())
      .range(source.range())
      .interpolate(source.interpolate())
      .clamp(source.clamp());
};

// deinterpolate(a, b)(x) takes a domain value x in [a,b] and returns the corresponding parameter t in [0,1].
// reinterpolate(a, b)(t) takes a parameter t in [0,1] and returns the corresponding domain value x in [a,b].
export default function quantitative(deinterpolate, reinterpolate) {
  var domain = unit,
      range = unit,
      interpolate = value,
      clamp = false,
      output,
      input;

  function rescale() {
    var map = Math.min(domain.length, range.length) > 2 ? polymap : bimap;
    output = map(domain, range, clamp ? deinterpolateClamp(deinterpolate) : deinterpolate, interpolate);
    input = map(range, domain, clamp ? deinterpolateClamp(deinterpolateLinear) : deinterpolateLinear, reinterpolate);
    return scale;
  }

  function scale(x) {
    return output(x);
  }

  scale.invert = function(y) {
    return input(y);
  };

  scale.domain = function(_) {
    return arguments.length ? (domain = map.call(_, number), rescale()) : domain.slice();
  };

  scale.range = function(_) {
    return arguments.length ? (range = slice.call(_), rescale()) : range.slice();
  };

  scale.rangeRound = function(_) {
    return range = map.call(_, number), interpolate = round, rescale();
  };

  scale.clamp = function(_) {
    return arguments.length ? (clamp = !!_, rescale()) : clamp;
  };

  scale.interpolate = function(_) {
    return arguments.length ? (interpolate = _, rescale()) : interpolate;
  };

  return rescale();
};
