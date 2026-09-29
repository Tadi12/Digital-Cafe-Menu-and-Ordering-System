const fs = require('fs');

const files = [
  'src/pages/admin/AdminDevicesPage.jsx',
  'src/pages/admin/CategoryManagerPage.jsx',
  'src/pages/admin/DrinkManagerPage.jsx',
  'src/pages/admin/FoodManagerPage.jsx',
  'src/pages/admin/TableManagerPage.jsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('ConfirmModal')) {
    content = content.replace(/import React/, "import ConfirmModal from '../../components/common/ConfirmModal';\nimport React");
  }

  if (!content.includes('confirmModalState')) {
    content = content.replace(/(const \[.*, .*\] = useState\(.*\);)/, "$1\n  const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, onConfirm: () => {}, message: '', title: '' });\n");
  }

  if (!content.includes('<ConfirmModal')) {
    content = content.replace(/(\n\s*<\/[a-zA-Z]+>\n\s*\);\n};)/, '\n      <ConfirmModal isOpen={confirmModalState.isOpen} onClose={() => setConfirmModalState({ ...confirmModalState, isOpen: false })} onConfirm={confirmModalState.onConfirm} title={confirmModalState.title} message={confirmModalState.message} confirmText="Confirm" isDestructive={true} />$1');
  }
  
  // Custom replacements for window.confirm
  if (file.includes('AdminDevicesPage')) {
    content = content.replace(/if \(!window\.confirm\(t\('terminate_confirm', \{ action \}\)\)\) return;/, "setConfirmModalState({ isOpen: true, title: 'Terminate', message: t('terminate_confirm', { action }), onConfirm: async () => { /* Original logic below */\n      try {\n        const res = await terminateAdminSessionApi(id);\n        if (res.success) {\n          setSessions(prev => prev.map(s => s._id === id ? { ...s, isActive: false, revokedAt: new Date() } : s));\n          if (res.data.isCurrent) {\n            logout();\n            navigate('/admin/login');\n          }\n        }\n      } catch (err) {\n        console.error(err);\n      }\n    }});\n    return;");
  }

  fs.writeFileSync(file, content);
});

console.log('done');
