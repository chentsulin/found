import isEqual from 'lodash/isEqual';
import pathToRegexp from 'path-to-regexp';

export default class Matcher {
  constructor(routeConfig) {
    this.routeConfig = routeConfig;
  }

  match({ pathname }) {
    const matches = this.matchRoutes(this.routeConfig, pathname);
    if (!matches) {
      return null;
    }

    const routeIndices = new Array(matches.length);
    const routeParams = new Array(matches.length);
    const params = {};

    matches.forEach((routeMatch, i) => {
      routeIndices[i] = routeMatch.index;
      routeParams[i] = routeMatch.params;
      Object.assign(params, routeMatch.params);
    });

    return { routeIndices, routeParams, params };
  }

  matchRoutes(routeConfig, pathname) {
    for (let index = 0; index < routeConfig.length; ++index) {
      const route = routeConfig[index];

      const match = this.matchRoute(route, pathname);
      if (!match) {
        continue; // eslint-disable-line no-continue
      }

      const { children = [] } = route;
      const { params, remaining } = match;

      const childMatches = this.matchRoutes(children, remaining);
      if (childMatches) {
        return [{ index, params }, ...childMatches];
      }

      if (!remaining) {
        return [{ index, params }];
      }
    }

    return null;
  }

  matchRoute(route, pathname) {
    const routePath = route.path;
    if (!routePath) {
      return {
        params: {},
        remaining: pathname,
      };
    }

    const pattern = this.getCanonicalPattern(routePath);
    const regexp = pathToRegexp(pattern, { end: false });

    const match = regexp.exec(pathname);
    if (match === null) {
      return null;
    }

    const params = Object.create(null);
    regexp.keys.forEach(({ name }, index) => {
      const value = match[index + 1];
      params[name] = value && decodeURIComponent(value);
    });

    return {
      params,
      remaining: pathname.slice(match[0].length),
    };
  }

  getCanonicalPattern(pattern) {
    return pattern.charAt(0) === '/' ? pattern : `/${pattern}`;
  }

  isActive(location, { location: matchLocation }, { exact } = {}) {
    return (
      this.isPathnameActive(
        location.pathname, matchLocation.pathname, exact,
      ) &&
      this.isQueryActive(
        location.query, matchLocation.query,
      )
    );
  }

  isPathnameActive(pathname, matchPathname, exact) {
    if (exact) {
      return pathname === matchPathname;
    }

    // Can't use startsWith, as that requires a polyfill.
    return matchPathname.indexOf(pathname) === 0;
  }

  isQueryActive(query, matchQuery) {
    if (!query) {
      return true;
    }

    return Object.entries(query).every(([key, value]) => (
      Object.prototype.hasOwnProperty.call(matchQuery, key) &&
        isEqual(matchQuery[key], value)
    ));
  }
}
