const fs = require('fs');
let c = fs.readFileSync('src/pages/admin/DashboardPage.jsx', 'utf8');

const target = \  if (admin?.role === 'chef') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6">
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-sm border border-cafe-200 overflow-hidden">
          <img src="/kitchen-dashboard.jpg" alt="Kitchen" className="w-full h-80 object-cover" />
          <div className="p-8 text-center">
            <h1 className="text-3xl font-display font-bold text-cafe-900 mb-2">Welcome to the Kitchen</h1>
            <p className="text-cafe-600 mb-6">Your station is ready. Head over to the Order Management tab to see incoming tickets.</p>
          </div>
        </div>
      </div>
    );
  }\;

const replacement = \  if (admin?.role === 'chef' || admin?.role === 'waiter') {
    const isChef = admin.role === 'chef';
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6">
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-sm border border-cafe-200 overflow-hidden">
          <img 
            src={isChef ? "/kitchen-dashboard.jpg" : "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=2000"} 
            alt={isChef ? "Kitchen" : "Service Floor"} 
            className="w-full h-80 object-cover" 
          />
          <div className="p-8 text-center">
            <h1 className="text-3xl font-display font-bold text-cafe-900 mb-2">
              {isChef ? "Welcome to the Kitchen" : "Service Dashboard"}
            </h1>
            <p className="text-cafe-600 mb-6">
              {isChef 
                ? "Your station is ready. Head over to the Order Management tab to see incoming tickets." 
                : "Your station is ready. Head over to the Order Management tab to serve ready tickets to customers."}
            </p>
          </div>
        </div>
      </div>
    );
  }\;

c = c.replace(target, replacement);
fs.writeFileSync('src/pages/admin/DashboardPage.jsx', c);
console.log('done');
