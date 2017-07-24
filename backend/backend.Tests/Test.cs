using NUnit.Framework;
using System;
using System.Linq;

namespace backend.Tests
{
    [TestFixture]
    public class Test
    {
        [Test]
        public void TestCase()
        {
            var controller = new ListItemController();
            controller.Post(1, Enumerable.Empty<ListItem>());
        }
    }
}
