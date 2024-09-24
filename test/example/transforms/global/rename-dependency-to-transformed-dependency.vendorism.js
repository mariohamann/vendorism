export const transform = (content, path) => {
  return {
    content: content
      .replace('dependency', 'transformedDependency')
      .replace('./transformedDependency', './dependency'),
    path
  }
}
