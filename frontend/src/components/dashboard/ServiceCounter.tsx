import {
  formatServiceCounter,
  type ServiceCount,
} from '../../utils/serviceCounter';
import Icon from '../common/Icon';

export default function ServiceCounter({ active, monitored }: ServiceCount) {
  return (
    <p className="service-counter">
      <Icon name="server" />
      {formatServiceCounter({ active, monitored })}
    </p>
  );
}
