async function check() {
  try {
    const url = 'file:///' + require('path').resolve('public/assets/index-DGDPhK2a.js').replace(/\\/g, '/');
    // Using import to validate syntax
    await import(url);
    console.log('Bundle executed/imported successfully without syntax errors!');
  } catch (err) {
    if (err.message && err.message.includes('document is not defined')) {
      console.log('Syntax is 100% VALID! (Threw document is not defined as expected in pure Node runtime without DOM)');
    } else {
      console.error('Import error:', err);
    }
  }
}
check();
