import { Link } from 'react-router-dom';
import { useAppContext } from '../layouts/AppLayout';
import { appRoutes } from '../lib/routes';

export default function NotFoundPage() {
  const { dictionary } = useAppContext();

  return (
    <div className="empty-state">
      <h1>{dictionary.pages.notFound}</h1>
      <Link className="text-link" to={appRoutes.home}>
        {dictionary.pages.backHome}
      </Link>
    </div>
  );
}
