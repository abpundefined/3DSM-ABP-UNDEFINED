import { Link } from 'react-router';
import Icon from './Icon';

export default function Brand() {
  return (
    <Link to="/" className="brand" aria-label="GreenER — dashboard">
      <span className="brand-mark">
        <Icon name="leaf" />
      </span>
      <span>
        Green<span className="brand-ending">ER</span>
      </span>
    </Link>
  );
}
