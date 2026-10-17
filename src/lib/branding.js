const logoUrls = ['jpg', 'png', 'jpeg'].map(extension => `${import.meta.env.BASE_URL}branding/trauts-logo.${extension}`);

export function branding(sidebar = false) {
  const fallback = sidebar
    ? '<div class="brand-logo brand-mark">T</div><div><h2>TRAUTS</h2><p>SHOP MANAGER</p></div>'
    : '<div class="brand-icon">T</div><h1>TRAUTS</h1><p>SHOP MANAGER</p>';
  return `<div class="${sidebar ? 'sidebar-brand' : 'brand'}" data-brand><img class="trauts-logo ${sidebar ? 'trauts-logo-sidebar' : 'trauts-logo-auth'}" alt="TRAUTS Technologies" width="180" height="180" hidden><div class="brand-fallback ${sidebar ? 'brand-fallback-sidebar' : ''}">${fallback}</div><p class="brand-product-label" hidden>SHOP MANAGER</p></div>`;
}

export function mountBranding(root) {
  root.querySelectorAll('[data-brand]').forEach(brand => {
    const image = brand.querySelector('.trauts-logo');
    image.addEventListener('load', () => {
      image.hidden = false;
      brand.querySelector('.brand-fallback').hidden = true;
      brand.querySelector('.brand-product-label').hidden = false;
      brand.classList.add('has-brand-image');
    }, { once: true });
    // Keep the existing brand readable until the uploaded asset is available.
    let sourceIndex = 0;
    image.addEventListener('error', () => {
      sourceIndex++;
      if (sourceIndex < logoUrls.length) image.src = logoUrls[sourceIndex];
      else image.hidden = true;
    });
    image.src = logoUrls[0];
  });
}
