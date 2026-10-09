const website = 'https://codyoakland.com';

export function CodyDiscovery() {
  return <aside className="cody-discovery" aria-label="Explore with Cody Oakland">
    <h4>Better questions. Deeper understanding.</h4>
    <p>Discover more about yourself and what helps you thrive.</p>
    <a href={website} target="_blank" rel="noopener noreferrer">Keep exploring with Cody Oakland <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
  </aside>;
}

export function CodyFooter() {
  return <footer className="cody-footer">
    <a href={website} target="_blank" rel="noopener noreferrer">Created by Cody Oakland <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
    <p>Better questions. Deeper understanding.</p>
  </footer>;
}
