/** Native modal behavior provides focus containment, Escape handling and focus return. */
export function modal(node: HTMLDialogElement) {
  node.showModal();
  return {
    destroy() {
      if (node.open) node.close();
    },
  };
}
