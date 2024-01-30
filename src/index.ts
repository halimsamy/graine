import ISeederWriter from './writer';
import Seeder from './seeder';
import SeederFactory from './factory';
import { ref } from './ref';

const Graine = new Seeder();

export default Graine;
export { ISeederWriter, Seeder, SeederFactory, ref };
