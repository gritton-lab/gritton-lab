export interface BandPhoto {
  image: string;
  alt: string;
  label?: string;
  caption?: string;
  focus?: string;
}

// Separate selections keep each page's banner distinct.
export const homePhotos: BandPhoto[] = [
  { image: '/images/uploads/martin-cns.jpeg', alt: 'Martin discussing a research poster at the Cognitive Neuroscience Society meeting', label: 'Cognitive Neuroscience Society', caption: 'Presenting work on cortical circuit dynamics in spatially directed attention.', focus: '60% 50%' },
  { image: '/images/uploads/bioe-symposium.jpeg', alt: 'Five researchers together at the Bioengineering Graduate Research Symposium', label: 'Bioengineering Graduate Research Symposium', caption: 'Sharing research and ideas across the graduate community.', focus: '50% 48%' },
  { image: '/images/uploads/temple-ben-howard.jpg', alt: 'Howard Gritton and colleagues with Temple Grandin', label: 'Scientific community', caption: 'Connecting with colleagues and exchanging perspectives.', focus: '50% 30%' },
];

export const aboutPhotos: BandPhoto[] = [
  { image: '/images/uploads/elliott-liss-urs-2026.jpg', alt: 'Elliott Liss presenting a poster on cholinergic contributions to auditory discrimination', label: 'Undergraduate research', caption: 'Investigating how neural circuits support auditory discrimination.', focus: '45% 30%' },
  { image: '/images/uploads/rachael-temple.jpg', alt: 'Rachael Bell with Temple Grandin', label: 'Shared perspectives', caption: 'Research grows through conversations within and beyond the lab.', focus: '50% 20%' },
  { image: '/images/uploads/eric-isur-2024.jpg', alt: 'Eric presenting a poster about hippocampal signaling and working memory', label: 'Student research', caption: 'Developing questions, conducting experiments, and sharing the results.', focus: '45% 30%' },
];

export const projectPhotos: BandPhoto[] = [
  { image: '/images/uploads/oliver-ear-day-2024.jpg', alt: 'Oliver presenting auditory scene analysis research at Ear Day 2024', label: 'Ear Day 2024', caption: 'Auditory scene analysis: how the cortex separates a target voice from competing sound.', focus: '70% 50%' },
  { image: '/images/uploads/aiden-chan-urs-2026.jpeg', alt: 'Aiden Chan beside a research poster on retrograde AAV staining in FMR1 knockout mice', label: 'Undergraduate research', caption: 'Investigating the circuits and pathways behind sensory processing.', focus: '40% 20%' },
  { image: '/images/uploads/jingtong-he-urs-2026.jpg', alt: 'Jingtong He presenting a poster on interneurons and extinction learning in the hippocampus', label: 'Undergraduate research', caption: 'Studying how hippocampal circuits contribute to learning and memory.', focus: '65% 30%' },
];
