using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.Linq;
using System.Collections.Generic;

namespace backend.UnitTest
{
    [TestClass]
    public class UnitTest1
    {
        [TestMethod]
        public void TestMethod1()
        {
            var controller = new ListItemController();
            controller.Post(1, new List<ListItem> { new ListItem { Id = "aisdf", Description = "Hello World", Complete = true, ModifiedUTC = 8 } });
        }
    }
}
