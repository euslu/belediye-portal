import EnvanterEslestirme from './EnvanterEslestirme';
import PageHeader from '../../components/ui/PageHeader';

export default function Envanter() {
  return (
    <div style={{ padding: '24px 20px', maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader title="Kullanıcı Eşleştirme" icon={<i className="bi bi-people" style={{ fontSize: 22 }} />} />
      <div style={{ marginTop: 20 }}>
        <EnvanterEslestirme />
      </div>
    </div>
  );
}
