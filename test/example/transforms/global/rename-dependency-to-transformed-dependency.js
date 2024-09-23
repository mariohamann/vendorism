export const transform = (content) => content
  .replace('dependency', 'transformedDependency')
  .replace('./transformedDependency', './dependency')
