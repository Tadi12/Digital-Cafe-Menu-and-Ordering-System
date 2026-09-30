const fs = require('fs');
let c = fs.readFileSync('src/components/customer/CartDrawer.jsx', 'utf8');

c = c.replace('const [nameError, setNameError] = useState("");', 'const [nameError, setNameError] = useState("");\n  const [paymentMethod, setPaymentMethod] = useState("Cash");');

const replaceTarget = {/* Payment Method Notice */}
              <div className="bg-cafe-50 border border-cafe-200 rounded-xl p-3 flex items-center gap-3 text-xs dark:border-recipe-border dark:bg-recipe-cardHover">
                <Banknote className="w-5 h-5 text-emerald-600 shrink-0 dark:text-emerald-400" />
                <div>
                  <span className="font-bold text-cafe-900 block dark:text-recipe-text">
                    {t("payment_method")}
                  </span>
                  <span className="text-cafe-600 dark:text-recipe-muted">{t("cash_on_table")}</span>
                </div>
              </div>;

const newTarget = {/* Payment Method Selection */}
              <div className="bg-white border border-cafe-200 rounded-xl p-3 space-y-2 dark:border-recipe-border dark:bg-recipe-cardHover">
                <span className="font-bold text-cafe-900 block text-xs dark:text-recipe-text mb-2">
                  {t("payment_method") || "Payment Method"}
                </span>
                
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Cash')}
                    className={\py-2 px-1 text-xs font-bold rounded-lg border \\}
                  >
                    Cash / POS
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Telebirr')}
                    className={\py-2 px-1 text-xs font-bold rounded-lg border \\}
                  >
                    Telebirr
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CBE')}
                    className={\py-2 px-1 text-xs font-bold rounded-lg border \\}
                  >
                    CBE
                  </button>
                </div>
              </div>;

c = c.replace(replaceTarget, newTarget);
c = c.replace('onPlaceOrder();', 'onPlaceOrder(paymentMethod);');

fs.writeFileSync('src/components/customer/CartDrawer.jsx', c);
console.log('CartDrawer updated');
