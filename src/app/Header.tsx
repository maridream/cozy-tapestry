import { ThemeToggle } from './ThemeToggle';
import { YarnBall } from './YarnBall';
import './Header.css';

export function Header() {
  return (
    <header className="site-header">
      <div className="site-header__brand">
        <YarnBall size={44} />
        <div>
          <p className="site-header__name">Cozy Tapestry</p>
          <p className="site-header__tagline">Turn your pet into a crochet pattern</p>
        </div>
      </div>
      <ThemeToggle />
    </header>
  );
}
