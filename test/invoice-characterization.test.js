const test = require('node:test');
const assert = require('node:assert/strict');

const pricing = require('../lib/pricing');
const invoice = require('../lib/invoice');

test('invoice uses the same HSN slab and post-discount tax figures as the billed order', function () {
  // An in-memory cart/order only; no store or data/db.json access.
  const items = [{ id: 1, name: 'Rice', sku: 'RICE-1', hsn: '1006', price: 1000, qty: 1 }];
  const billed = pricing.computeTotals(items, 'WELCOME');
  const order = {
    id: 1001,
    items: items,
    coupon: 'WELCOME',
    subtotal: billed.subtotal,
    discount: billed.discount,
    tax: billed.tax,
    total: billed.total
  };
  const invoiced = invoice.computeInvoiceFigures(order);

  assert.deepEqual(
    { subtotal: billed.subtotal, discount: billed.discount, tax: billed.tax, cgst: billed.cgst, sgst: billed.sgst, total: billed.total },
    { subtotal: 1000, discount: 50, tax: 47.5, cgst: 23.75, sgst: 23.75, total: 997.5 }
  );
  assert.deepEqual(
    { subtotal: invoiced.subtotal, discount: invoiced.discount, tax: invoiced.tax, cgst: invoiced.cgst, sgst: invoiced.sgst, total: invoiced.total },
    { subtotal: billed.subtotal, discount: billed.discount, tax: billed.tax, cgst: billed.cgst, sgst: billed.sgst, total: billed.total }
  );
  assert.equal(invoiced.rows[0].gstPercent, 5);
  assert.equal(invoiced.rows[0].lineTax, 47.5);
  assert.equal(invoiced.total, order.total);
});

test('invoice preserves fractional gstRate as a decimal rate', function () {
  const result = invoice.computeInvoiceFigures({
    items: [{ name: 'Rice', price: 100, qty: 1, gstRate: 0.05 }]
  });

  assert.equal(result.rows[0].gstPercent, 5);
  assert.equal(result.tax, 5);
  assert.equal(result.total, 105);
});

test('rendered invoice shows the billed total without a reconciliation warning', function () {
  const order = {
    id: 42,
    date: '2026-11-21',
    customer: 'Customer',
    items: [{ name: 'Rice', price: 1000, qty: 1, hsn: '1006' }],
    coupon: 'WELCOME',
    total: 997.5
  };
  const html = invoice.render(order);

  assert.match(html, /Invoice Total<\/td><td class="r">[^<]*997\.50/);
  assert.doesNotMatch(html, /Accountant Reconciliation Notice/);
});
