using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Web.Http;

namespace backend
{
    public class ListItemController : ApiController
    {
        public IEnumerable<ListItem> Post(int lastSyncTime, IEnumerable<ListItem> items)
        {
            return items;
            //return new List<ListItem> { new ListItem { Id = "124" } };
        }
    }
}
